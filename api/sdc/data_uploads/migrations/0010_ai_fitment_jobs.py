# Generated migration for AI Fitment Jobs

from django.db import migrations, models
import django.db.models.deletion
import uuid


class Migration(migrations.Migration):

    dependencies = [
        ('data_uploads', '0009_merge_20250924_0422'),
        ('tenants', '0004_tenant_default_fitment_method'),
    ]

    operations = [
        migrations.CreateModel(
            name='AiFitmentJob',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('job_type', models.CharField(choices=[('upload', 'Product File Upload'), ('selection', 'Product Selection')], help_text='How products were provided for this job', max_length=20)),
                ('product_file', models.FileField(blank=True, help_text='Product file for upload-type jobs', null=True, upload_to='ai_fitment_jobs/products/')),
                ('product_file_name', models.CharField(blank=True, max_length=255)),
                ('product_ids', models.JSONField(blank=True, default=list, help_text='Product IDs for selection-type jobs')),
                ('product_count', models.IntegerField(default=0)),
                ('fitments_count', models.IntegerField(default=0)),
                ('approved_count', models.IntegerField(default=0)),
                ('rejected_count', models.IntegerField(default=0)),
                ('status', models.CharField(choices=[('in_progress', 'In Progress'), ('completed', 'Completed'), ('failed', 'Failed'), ('review_required', 'Review Required')], default='in_progress', max_length=20)),
                ('error_message', models.TextField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('created_by', models.CharField(blank=True, max_length=255)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('completed_at', models.DateTimeField(blank=True, null=True)),
                ('tenant', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='ai_fitment_jobs', to='tenants.tenant')),
            ],
            options={
                'verbose_name': 'AI Fitment Job',
                'verbose_name_plural': 'AI Fitment Jobs',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='AiGeneratedFitment',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('part_id', models.CharField(max_length=100)),
                ('part_description', models.TextField(blank=True)),
                ('year', models.IntegerField()),
                ('make', models.CharField(max_length=100)),
                ('model', models.CharField(max_length=100)),
                ('submodel', models.CharField(blank=True, max_length=100)),
                ('drive_type', models.CharField(blank=True, max_length=50)),
                ('fuel_type', models.CharField(blank=True, max_length=50)),
                ('num_doors', models.IntegerField(blank=True, null=True)),
                ('body_type', models.CharField(blank=True, max_length=100)),
                ('position', models.CharField(blank=True, max_length=100)),
                ('quantity', models.IntegerField(default=1)),
                ('confidence', models.FloatField(default=0.0, help_text='AI confidence score (0-1)')),
                ('confidence_explanation', models.TextField(blank=True)),
                ('ai_reasoning', models.TextField(blank=True)),
                ('dynamic_fields', models.JSONField(blank=True, default=dict)),
                ('status', models.CharField(choices=[('pending', 'Pending Review'), ('approved', 'Approved'), ('rejected', 'Rejected')], default='pending', max_length=20)),
                ('reviewed_at', models.DateTimeField(blank=True, null=True)),
                ('reviewed_by', models.CharField(blank=True, max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('job', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='generated_fitments', to='data_uploads.aifitmentjob')),
            ],
            options={
                'verbose_name': 'AI Generated Fitment',
                'verbose_name_plural': 'AI Generated Fitments',
                'ordering': ['-confidence', 'created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='aifitmentjob',
            index=models.Index(fields=['tenant', 'status'], name='data_upload_tenant__status_idx'),
        ),
        migrations.AddIndex(
            model_name='aifitmentjob',
            index=models.Index(fields=['created_at'], name='data_upload_created_idx'),
        ),
        migrations.AddIndex(
            model_name='aigeneratedfitment',
            index=models.Index(fields=['job', 'status'], name='data_upload_job_status_idx'),
        ),
        migrations.AddIndex(
            model_name='aigeneratedfitment',
            index=models.Index(fields=['confidence'], name='data_upload_confiden_idx'),
        ),
    ]

